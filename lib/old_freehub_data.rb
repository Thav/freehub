# Require all the files in the old_freehub_data directory
Dir[File.join(File.dirname(__FILE__), 'old_freehub_data', '*.rb')].each { |file| require file }