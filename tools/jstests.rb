require 'thread'
require 'webrick'
require 'fileutils'
require 'rubygems'
require 'active_support'
require 'benchmark'
require 'timeout'

class OS
	def self.win32?
		PLATFORM.match(/win32/) or PLATFORM.match(/cygwin/)
	end
	
	def self.cygwin?
		PLATFORM.match(/cygwin/)
	end

	def self.osx?
		PLATFORM.match(/darwin/)
	end
	
	def self.linux?
		PLATFORM.match(/linux/)
	end
		
end

if OS.win32?
	require 'win32ole'
end

if OS.osx?
	def applescript(script)
		system "osascript -e '#{script}' 2>&1 >/dev/null"
	end
end

class IeBrowser
  def initialize
    return unless OS.win32?
    @ie = WIN32OLE.new('InternetExplorer.Application')
    @ie.Visible = true
  end

  def supported?
    OS.win32?
  end

  def teardown
    @ie.Quit
  end

  def close_page(url)
  end

  def visit(url)
    @ie.Visible = true
    @ie.Navigate(url)
    while @ie.busy and @ie.readyState != 4 do
      sleep(1)
    end
		sleep(1)
    while @ie.busy and @ie.readyState != 4 do
      sleep(1)
    end
  end
  def to_s; "IE"; end
end

class FirefoxBrowser
  def initialize
    if OS.win32?
      @path = File.join('C:', 'Program Files', 'Mozilla Firefox', 'firefox.exe')
			@supported = File.exist?(@path)
			if OS.cygwin?
				@path = `cygpath -u #{@path}`.gsub(/\n/,' ').gsub(/ /,'\ ').gsub(/\\\ $/,'')
			end
    elsif OS.linux?
      html_view = `which htmlview`.strip
      if File.exist?(html_view)
        @path = html_view
        @supported = true
      else
        @path = `which firefox`.strip
        @supported = File.exist?(@path)
      end
    elsif OS.osx?
			@supported = true
		end
  end
  
  def supported?
    @supported
  end

  def teardown
  end

  def visit(url)
    if OS.osx?
      applescript(%Q(tell application "Firefox"
                        activate
                        Get URL "#{url}"
                     end tell
                    ))
    else
      system("#{@path} #{url}")
    end
  end

  def close_page(url)
    if OS.osx?
      # see: http://lists.apple.com/archives/applescript-users/2007/Aug/msg00262.html
      # TODO: we need a better way to teardown in firefox
      applescript %Q(tell application "Firefox"
                        activate
                        tell application "System Events"
                          keystroke "w" using command down
                        end tell
                      end tell)
    end
  end

  def to_s; "Firefox"; end
end

class OperaBrowser
  def initialize
    if OS.win32?
      @path = File.join('C:', 'Program Files', 'Opera', 'Opera.exe')
			@supported = true if File.exist?(@path)
			if OS.cygwin?
				@path = `cygpath -u #{@path}`.gsub(/\n/,' ').gsub(/ /,'\ ').gsub(/\\\ $/,'')
			end
    end
    if OS.linux?
      @path = `which opera`
			@supported = true if File.exist?(@path)
    end
    if OS.osx?
      if applescript('tell application "Opera" to make new document')
				@supported = true
			end
    end
  end
  
  def supported?
    @supported
  end

  def teardown
    if OS.osx?
      applescript('tell application "Opera" to close front document')
    else
      # TODO:
    end
  end

  def close_page(url)
    if OS.osx?
      # see: http://lists.apple.com/archives/applescript-users/2007/Aug/msg00262.html
      applescript(%Q(tell application "Opera" 
                      activate
                      tell application "System Events"
                        keystroke "w" using command down
                      end tell
                    end tell
                    ))
    end
  end

  def visit(url)
    if OS.osx?
      #applescript('tell application "Opera" to GetURL "' + url + '"')
      applescript(%Q(tell application "Opera"
                       activate
                       GetURL "#{url}"
                     end tell
                    ))
    else
      system("#{@path} #{url}")
    end
  end

  def to_s; "Opera"; end

end

class KonquerorBrowser
#TODO: implement me
  def supported?
    false
  end
end

class SafariBrowser
  def initialize
    #applescript('tell application "Safari" to make new document')
  end

  def supported?
    OS.osx?
  end

  def teardown
    applescript('tell application "Safari" to close front document')
  end

  def close_page(url)
  end

  def visit(url)
    applescript(%Q(tell application "Safari"
                     activate
                     set URL of front document to "#{url}"
                   end tell
                  ))
  end

  def to_s ;"Safari" ;end
end

::WEBrick::HTTPServer.class_eval do
  def access_log(config, req, res)
    #puts "Access: #{req.unparsed_uri}, #{res.status}"
    # silence logging
  end
end
::WEBrick::BasicLog.class_eval do
  def log(level, data)
    # silence logging
    #puts "Basic: #{level.inspect}, #{data.inspect}"
  end
end

# from jstest.rb, make sure the files aren't being cached
class NonCachingFileHandler < WEBrick::HTTPServlet::FileHandler
  def do_GET(req, res)
    super
 
    res['Content-Type'] = case req.path
      when /\.js$/   then 'text/javascript'
      when /\.html$/ then 'text/html'
      when /\.css$/  then 'text/css'
      else 'text/plain'
    end
 
    res['ETag'] = nil
    res['Last-Modified'] = Time.now + 100**4
    res['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0'
    res['Pragma'] = 'no-cache'
    res['Expires'] = Time.now - 100**4
  end
end

 
=begin
  usage:

  tester = JSTestRunner.new

  tester.mount("/url","path")

  tester.add_tests( Dir["test/unit/*.html"] )

  tester.add_browsers( :safari, :firefox, :ie, :konqueror, :opera )

  tester.run

=end
class JSTestRunner
  def initialize( port = 4711 )
    @tests = []
    @browsers = []

    @server = WEBrick::HTTPServer.new(:Port => port)
    @queue = Queue.new
    
    # from jstest.rb
    @server.mount_proc("/results") do |req, res|
      @queue.push({
        :tests => req.query['tests'].to_i,
        :assertions => req.query['assertions'].to_i,
        :failures => req.query['failures'].to_i,
        :errors => req.query['errors'].to_i
      })
      res.body = "OK"
    end

    @server.mount_proc("/content-type") do |req, res|
      res.body = req["content-type"]
    end

    @server.mount_proc("/response") do |req, res|
      req.query.each {|k, v| res[k] = v unless k == 'responseBody'}
      res.body = req.query["responseBody"]
    end    

  end

  # run the server only
  def start
    trap("INT") { @server.shutdown }
    @server.start
  end

  def mount(url,filepath)
    @server.mount(url, NonCachingFileHandler, filepath, true )
  end

  def add_tests( *tests )
    @tests += tests
  end

  def add_browsers( *browsers )
    @browsers += browsers
  end

  def run
    trap("INT") do
      @server.shutdown 
      exit( 1 )
    end
    t = Thread.new { @server.start }

    @browsers.flatten!
    @tests.flatten!

    @browsers = @browsers.collect{|browser| "#{browser.to_s.camelize}Browser".constantize.new}
    @browsers = @browsers.select{|browser| browser.supported? }

    @browsers.each do|browser|
      results = {:tests => 0, :assertions => 0, :failures => 0, :errors => 0}
      errors = []
      failures = []
      test_time = Benchmark::measure do
        puts "Testing browser => #{browser}"
        @tests.each do |test|
          result = []
          value = "."
          begin
            Timeout::timeout(10) do 
							browser.visit("http://localhost:4711/#{test}?resultsURL=http://localhost:4711/results&t=" + ("%.6f" % Time.now.to_f))
              result = @queue.pop
              result.each { |k, v| results[k] += v }
            end
          rescue Timeout::Error => e
            puts e.message
            result = {}
            result[:failures] = 0
            result[:errors] = 1
          end
          
          if result[:failures] > 0
            value = "F"
            failures.push(test)
          end
          
          if result[:errors] > 0
            value = "E"
            errors.push(test)
          end

          if value == "."
            browser.close_page(test)
          end
   
          STDERR.print value
        end
      end

      if failures.empty? and errors.empty?
        browser.teardown
      end
 
      puts "\nFinished in #{(test_time.real).round.to_s} seconds."
      puts "  Failures: #{failures.join(', ')}" unless failures.empty?
      puts "  Errors:   #{errors.join(', ')}" unless errors.empty?
      puts "#{results[:tests]} tests, #{results[:assertions]} assertions, #{results[:failures]} failures, #{results[:errors]} errors"
    end
    
    @server.shutdown
    t.join
  end

end
