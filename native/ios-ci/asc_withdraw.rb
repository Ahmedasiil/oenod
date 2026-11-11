# Pulls the waiting review submission (cancel) and renames the editable version to NEW_VERSION.
# Prints RESULT lines only; never prints secrets.
require 'jwt'; require 'openssl'; require 'net/http'; require 'json'
KEY = OpenSSL::PKey.read(ENV.fetch('APPLE_KEY_P8'))
NEW = ENV.fetch('NEW_VERSION')
def token
  JWT.encode({ iss: ENV['APPLE_ISSUER_ID'], iat: Time.now.to_i - 30, exp: Time.now.to_i + 900, aud: 'appstoreconnect-v1' },
             KEY, 'ES256', { kid: ENV['APPLE_KEY_ID'], typ: 'JWT' })
end
def call(m, path, body = nil)
  u = URI("https://api.appstoreconnect.apple.com#{path}")
  req = { get: Net::HTTP::Get, patch: Net::HTTP::Patch }[m].new(u)
  req['Authorization'] = "Bearer #{token}"; req['Content-Type'] = 'application/json'
  req.body = body.to_json if body
  r = Net::HTTP.start(u.host, 443, use_ssl: true) { |h| h.request(req) }
  [r.code.to_i, (JSON.parse(r.body) rescue {})]
end
def err(b) = (b['errors'] || []).map { |e| "#{e['code']}: #{e['detail']}" }.join(' | ')
_, a = call(:get, '/v1/apps?filter[bundleId]=com.oenod.app')
app = a['data']&.first or abort('RESULT app: not found')
_, subs = call(:get, "/v1/apps/#{app['id']}/reviewSubmissions?limit=10")
(subs['data'] || []).select { |s| %w[WAITING_FOR_REVIEW READY_FOR_REVIEW IN_REVIEW].include?(s['attributes']['state']) }.each do |s|
  c, b = call(:patch, "/v1/reviewSubmissions/#{s['id']}", { data: { type: 'reviewSubmissions', id: s['id'], attributes: { canceled: true } } })
  puts "RESULT cancel #{s['id']}: #{c == 200 ? 'ok' : 'FAILED ' + err(b)}"
end
ver = nil
20.times do
  _, vs = call(:get, "/v1/apps/#{app['id']}/appStoreVersions?limit=10")
  ver = vs['data']&.find { |v| %w[PREPARE_FOR_SUBMISSION DEVELOPER_REJECTED REJECTED METADATA_REJECTED].include?(v['attributes']['appStoreState']) }
  break if ver
  puts "RESULT waiting: #{vs['data']&.map { |v| "#{v['attributes']['versionString']}=#{v['attributes']['appStoreState']}" }&.join(',')}"
  sleep 15
end
abort('RESULT version: still not editable') unless ver
puts "RESULT version: #{ver['attributes']['versionString']} (#{ver['attributes']['appStoreState']})"
if ver['attributes']['versionString'] != NEW
  c, b = call(:patch, "/v1/appStoreVersions/#{ver['id']}", { data: { type: 'appStoreVersions', id: ver['id'], attributes: { versionString: NEW } } })
  puts "RESULT rename to #{NEW}: #{c == 200 ? 'ok' : 'FAILED ' + err(b)}"
end
