# Enable auto-complete and readline history in IRB
# http://quotedprintable.com/2007/6/9/irb-history-and-completion
require "irb/completion"
require "irb/ext/save-history"
IRB.conf[:PROMPT_MODE] = :SIMPLE
IRB.conf[:SAVE_HISTORY] = 1_000
IRB.conf[:HISTORY_FILE] = "#{ENV['HOME']}/.irb_history"

# https://github.com/michaeldv/awesome_print#irb-integration
begin
  require "awesome_print"
  AwesomePrint.irb!
rescue LoadError
end
