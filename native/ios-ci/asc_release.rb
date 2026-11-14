# Releases the approved (PENDING_DEVELOPER_RELEASE) App Store version to the public.
# Prints RESULT lines only; never prints secrets.
require 'jwt'; require 'openssl'; require 'net/http'; require 'json'
KEY = OpenSSL::PKey.read(ENV.fetch('APPLE_KEY_P8'))
WANT = ENV.fetch('RELEASE_VERSION')
def token
  JWT.encode({ iss: ENV['APPLE_ISSUER_ID'], iat: Time.now.to_i - 30, exp: Time.now.to_i + 900, aud: 'appstoreconnect-v1' },
             KEY, 'ES256', { kid: ENV['APPLE_KEY_ID'], typ: 'JWT' })
end
def call(m, path, body = nil)
  u = URI("https://api.appstoreconnect.apple.com#{path}")
  req = { get: Net::HTTP::Get, post: Net::HTTP::Post }[m].new(u)
  req['Authorization'] = "Bearer #{token}"; req['Content-Type'] = 'application/json'
  req.body = body.to_json if body
  r = Net::HTTP.start(u.host, 443, use_ssl: true) { |h| h.request(req) }
  [r.code.to_i, (JSON.parse(r.body) rescue {})]
end
def err(b) = (b['errors'] || []).map { |e| "#{e['code']}: #{e['detail']}" }.join(' | ')
_, a = call(:get, '/v1/apps?filter[bundleId]=com.oenod.app')
app = a['data']&.first or abort('RESULT app: not found')
_, vs = call(:get, "/v1/apps/#{app['id']}/appStoreVersions?limit=10")
ver = vs['data']&.find { |v| v['attributes']['versionString'] == WANT }
abort("RESULT version #{WANT}: not found") unless ver
st = ver['attributes']['appStoreState']
abort("RESULT version #{WANT}: #{st} (not PENDING_DEVELOPER_RELEASE, nothing done)") unless st == 'PENDING_DEVELOPER_RELEASE'
c, b = call(:post, '/v1/appStoreVersionReleaseRequests',
            { data: { type: 'appStoreVersionReleaseRequests', relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: ver['id'] } } } } })
puts "RESULT release #{WANT}: #{[200, 201].include?(c) ? 'ok' : "FAILED #{c} " + err(b)}"
sleep 10
_, v2 = call(:get, "/v1/appStoreVersions/#{ver['id']}")
puts "RESULT state now: #{v2.dig('data', 'attributes', 'appStoreState')}"
