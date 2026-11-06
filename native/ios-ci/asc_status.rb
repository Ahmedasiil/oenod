# Read-only: prints the App Store version states and the latest review submission for com.oenod.app.
# Changes nothing in App Store Connect. Prints RESULT lines only; never prints secrets.
require 'jwt'; require 'openssl'; require 'net/http'; require 'json'
KEY = OpenSSL::PKey.read(ENV.fetch('APPLE_KEY_P8'))
def token
  JWT.encode({ iss: ENV['APPLE_ISSUER_ID'], iat: Time.now.to_i - 30, exp: Time.now.to_i + 900, aud: 'appstoreconnect-v1' },
             KEY, 'ES256', { kid: ENV['APPLE_KEY_ID'], typ: 'JWT' })
end
def get(path)
  u = URI("https://api.appstoreconnect.apple.com#{path}")
  req = Net::HTTP::Get.new(u); req['Authorization'] = "Bearer #{token}"
  r = Net::HTTP.start(u.host, 443, use_ssl: true) { |h| h.request(req) }
  JSON.parse(r.body) rescue {}
end
app = get('/v1/apps?filter[bundleId]=com.oenod.app')['data']&.first or abort('RESULT app: not found')
puts "RESULT app: #{app['id']}"
(get("/v1/apps/#{app['id']}/appStoreVersions?limit=10")['data'] || []).each do |v|
  a = v['attributes']
  puts "RESULT version #{a['versionString']} (#{a['platform']}): #{a['appStoreState']} / #{a['appVersionState']} created #{a['createdDate']}"
end
(get("/v1/apps/#{app['id']}/reviewSubmissions?limit=5")['data'] || []).each do |s|
  a = s['attributes']
  puts "RESULT review submission #{s['id']}: #{a['state']} submitted #{a['submittedDate']}"
end
