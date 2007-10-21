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

  tester.mount "/testjs",    TEST_JS_PATH
  tester.mount "/testcss",   TEST_CSS_PATH
  tester.mount "/libjs",     LIB_PATH
  tester.mount "/test/unit", UNIT_TEST_PATH

  tester.add_tests Dir["test/unit/*.html"]

  tester.add_browsers "safari", "firefox", "ie", "konqueror", "opera"

  tester.run
end
