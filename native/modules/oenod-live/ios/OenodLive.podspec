Pod::Spec.new do |s|
  s.name           = 'OenodLive'
  s.version        = '1.0.0'
  s.summary        = 'OENOD: the live shift Live Activity (lock screen and Dynamic Island)'
  s.author         = 'OENOD Inc.'
  s.homepage       = 'https://oenod.com'
  s.license        = { :type => 'Proprietary' }
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.weak_frameworks = 'ActivityKit'
  s.source_files   = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES', 'SWIFT_COMPILATION_MODE' => 'wholemodule' }
end
