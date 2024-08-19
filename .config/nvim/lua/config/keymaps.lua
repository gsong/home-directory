-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here
vim.keymap.set("n", "<leader>m", "<cmd>!open -g -a Marked\\ 2.app '%:p'<cr>", { desc = "Preview in Marked" })

-- Function to temporarily mark a word as good in the current buffer
local function add_word_to_buffer()
  local word = vim.fn.expand("<cword>")
  vim.cmd("spellgood! " .. word)
end

-- Map zG to the custom function
vim.keymap.set("n", "zG", add_word_to_buffer, { desc = "Temporarily add word to buffer spell check" })
