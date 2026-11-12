Pod::Spec.new do |s|
  s.name           = 'OenodWatchLink'
  s.version        = '1.0.0'
  s.summary        = 'OENOD: hears the Apple Watch app asking to connect'
  s.author         = 'OENOD Inc.'
  s.homepage       = 'https://oenod.com'
  s.license        = { :type => 'Proprietary' }
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'WatchConnectivity'
  s.source_files   = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES', 'SWIFT_COMPILATION_MODE' => 'wholemodule' }
end
