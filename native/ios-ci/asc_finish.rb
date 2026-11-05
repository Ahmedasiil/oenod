# Finishes the App Store Connect setup with the API key: age rating, content rights, price (free),
# availability (all countries), attaches the build, and (when SUBMIT=true) sends the version for review.
# Prints RESULT lines only; never prints secrets.
require 'jwt'; require 'openssl'; require 'net/http'; require 'json'
BUNDLE = 'com.oenod.app'
KEY = OpenSSL::PKey.read(ENV.fetch('APPLE_KEY_P8'))
def token
  JWT.encode({ iss: ENV['APPLE_ISSUER_ID'], iat: Time.now.to_i - 30, exp: Time.now.to_i + 900, aud: 'appstoreconnect-v1' },
             KEY, 'ES256', { kid: ENV['APPLE_KEY_ID'], typ: 'JWT' })
end
def call(method, path, body = nil)
  u = URI(path.start_with?('http') ? path : "https://api.appstoreconnect.apple.com#{path}")
  req = { get: Net::HTTP::Get, post: Net::HTTP::Post, patch: Net::HTTP::Patch }[method].new(u)
  req['Authorization'] = "Bearer #{token}"; req['Content-Type'] = 'application/json'
  req.body = body.to_json if body
  r = Net::HTTP.start(u.host, 443, use_ssl: true) { |h| h.request(req) }
  [r.code.to_i, (JSON.parse(r.body) rescue {})]
end
def err(b) = (b['errors'] || []).map { |e| "#{e['code']}: #{e['detail']}" }.join(' | ')
def res(name, ok, extra = '') = puts("RESULT #{name}: #{ok ? 'ok' : 'FAILED'} #{extra}".strip)

_, a = call(:get, "/v1/apps?filter[bundleId]=#{BUNDLE}")
app = a['data']&.first or abort('RESULT app: not found')
app_id = app['id']; puts "RESULT app: #{app_id}"

# 1. Content rights
c, b = call(:patch, "/v1/apps/#{app_id}", { data: { type: 'apps', id: app_id, attributes: { contentRightsDeclaration: 'DOES_NOT_USE_THIRD_PARTY_CONTENT' } } })
res('content-rights', c == 200, c == 200 ? '' : err(b))

# 2. Age rating (everything None/No; the app has team chat, so messaging is answered Yes honestly)
_, infos = call(:get, "/v1/apps/#{app_id}/appInfos")
info = infos['data']&.find { |i| i['attributes']['appStoreState'] != 'READY_FOR_SALE' } || infos['data']&.first
_, ard = call(:get, "/v1/appInfos/#{info['id']}/ageRatingDeclaration")
if (d = ard['data'])
  attrs = {}
  d['attributes'].each do |k, v|
    next if k =~ /override|kidsAgeBand|ageRating$|Url$|developerAgeRating/i
    if k == 'messagingAndChat' then attrs[k] = true
    elsif v.is_a?(String) || (v.nil? && k !~ /^(is|has|unrestricted|gambling$|lootBox|messaging|userGenerated|advertising|parental|ageAssurance|healthOrWellness)/)
      attrs[k] = 'NONE'
    else attrs[k] = false
    end
  end
  c, b = call(:patch, "/v1/ageRatingDeclarations/#{d['id']}", { data: { type: 'ageRatingDeclarations', id: d['id'], attributes: attrs } })
  if c != 200 # retry once with the fields Apple complained about flipped between NONE and false
    bad = (b['errors'] || []).map { |e| e.dig('source', 'pointer').to_s.split('/').last }.compact
    bad.each { |k| attrs[k] = attrs[k] == 'NONE' ? false : 'NONE' if attrs.key?(k) }
    c, b = call(:patch, "/v1/ageRatingDeclarations/#{d['id']}", { data: { type: 'ageRatingDeclarations', id: d['id'], attributes: attrs } })
  end
  res('age-rating', c == 200, c == 200 ? '' : err(b))
else res('age-rating', false, 'no declaration found') end

# 3. Price: Free, base territory Canada
c, sched = call(:get, "/v1/apps/#{app_id}/appPriceSchedule")
if c == 200 && sched['data']
  _, mp = call(:get, "/v1/appPriceSchedules/#{sched['data']['id']}/manualPrices")
  have = mp['data']&.any?
else have = false end
if have then res('price', true, '(already set)')
else
  _, pp = call(:get, "/v1/apps/#{app_id}/appPricePoints?filter[territory]=CAN&limit=200")
  free = pp['data']&.find { |p| p['attributes']['customerPrice'].to_f == 0.0 }
  if free
    c, b = call(:post, '/v1/appPriceSchedules', {
      data: { type: 'appPriceSchedules', relationships: {
        app: { data: { type: 'apps', id: app_id } },
        baseTerritory: { data: { type: 'territories', id: 'CAN' } },
        manualPrices: { data: [{ type: 'appPrices', id: '${p0}' }] } } },
      included: [{ type: 'appPrices', id: '${p0}', attributes: { startDate: nil },
                   relationships: { appPricePoint: { data: { type: 'appPricePoints', id: free['id'] } } } }] })
    res('price', [200, 201].include?(c), [200, 201].include?(c) ? '(Free)' : err(b))
  else res('price', false, 'free price point not found') end
end

# 4. Availability: every country and new ones
c, av = call(:get, "/v1/apps/#{app_id}/appAvailabilityV2")
if c == 200 && av['data'] then res('availability', true, '(already set)')
else
  terrs = []; nxt = '/v1/territories?limit=200'
  while nxt; _, t = call(:get, nxt); terrs += (t['data'] || []).map { |x| x['id'] }; nxt = t.dig('links', 'next'); end
  inc = terrs.map { |t| { type: 'territoryAvailabilities', id: "${#{t}}", attributes: { available: true },
                          relationships: { territory: { data: { type: 'territories', id: t } } } } }
  c, b = call(:post, '/v2/appAvailabilities', { data: { type: 'appAvailabilities', attributes: { availableInNewTerritories: true },
    relationships: { app: { data: { type: 'apps', id: app_id } },
                     territoryAvailabilities: { data: inc.map { |i| { type: i[:type], id: i[:id] } } } } }, included: inc })
  res('availability', [200, 201].include?(c), [200, 201].include?(c) ? "(#{terrs.size} countries)" : err(b))
end

# 5. Attach build to the editable version
_, vs = call(:get, "/v1/apps/#{app_id}/appStoreVersions?filter[platform]=IOS&limit=5")
ver = vs['data']&.find { |v| %w[PREPARE_FOR_SUBMISSION DEVELOPER_REJECTED REJECTED METADATA_REJECTED].include?(v['attributes']['appStoreState']) }
abort('RESULT version: no editable version') unless ver
puts "RESULT version: #{ver['attributes']['versionString']} (#{ver['attributes']['appStoreState']})"
want = ENV['BUILD_NUMBER'].to_s
build = nil
30.times do
  _, bs = call(:get, "/v1/builds?filter[app]=#{app_id}&filter[version]=#{want}&limit=5")
  build = bs['data']&.first
  st = build && build['attributes']['processingState']
  break if st == 'VALID'
  puts "RESULT build #{want}: #{st || 'not visible yet'}, waiting"; sleep 30
end
if build && build['attributes']['processingState'] == 'VALID'
  c, b = call(:patch, "/v1/appStoreVersions/#{ver['id']}/relationships/build", { data: { type: 'builds', id: build['id'] } })
  res('build-attached', [200, 204].include?(c), [200, 204].include?(c) ? want : err(b))
else
  res('build-attached', false, "build #{want} is not ready yet; run again later"); exit 1
end

# 6. Submit for review (only when asked)
if ENV['SUBMIT'] == 'true'
  c, rs = call(:post, '/v1/reviewSubmissions', { data: { type: 'reviewSubmissions', attributes: { platform: 'IOS' },
                                                        relationships: { app: { data: { type: 'apps', id: app_id } } } } })
  if [200, 201].include?(c)
    sid = rs['data']['id']
    c, b = call(:post, '/v1/reviewSubmissionItems', { data: { type: 'reviewSubmissionItems', relationships: {
      reviewSubmission: { data: { type: 'reviewSubmissions', id: sid } }, appStoreVersion: { data: { type: 'appStoreVersions', id: ver['id'] } } } } })
    if [200, 201].include?(c)
      c, b = call(:patch, "/v1/reviewSubmissions/#{sid}", { data: { type: 'reviewSubmissions', id: sid, attributes: { submitted: true } } })
      res('submitted-for-review', c == 200, c == 200 ? '' : err(b)); exit(c == 200 ? 0 : 1)
    else res('submitted-for-review', false, "item: #{err(b)}"); exit 1 end
  else res('submitted-for-review', false, err(rs)); exit 1 end
end
