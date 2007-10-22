require 'rake'
require 'rake/packagetask'
require 'tools/jstests'

ROOT_PATH = File.expand_path( File.dirname(__FILE__) )
TEST_CSS_PATH = File.expand_path( File.join( ROOT_PATH, "test", "css/" ) )
TEST_JS_PATH = File.expand_path( File.join( ROOT_PATH, "test", "js/" ) )
LIB_PATH = File.expand_path( File.join( ROOT_PATH, "lib/" ) )
UNIT_TEST_PATH = File.expand_path( File.join( ROOT_PATH, "test", "unit/" ) )

task :default => [:test]

desc "Runs all the JavaScript unit tests and collects the results"
task :test do
  tester = JSTestRunner.new

  setup_tester( tester )

  tester.run
end

desc "startup the test server, but don't run tests automatically"
task :start do
  tester = JSTestRunner.new(4712)

  setup_tester( tester )

  puts "Tests are browsable at localhost:4712/test/unit/"
  tester.start
end

def setup_tester(tester)
  tester.mount "/testjs",    TEST_JS_PATH
  tester.mount "/testcss",   TEST_CSS_PATH
  tester.mount "/libjs",     LIB_PATH
  tester.mount "/test/unit", UNIT_TEST_PATH
  
  tester.add_tests Dir["test/unit/*.html"]

  tester.add_browsers "opera", "firefox", "ie", "konqueror", "safari"
end
