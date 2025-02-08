-- Autocmds are automatically loaded on the VeryLazy event
-- Default autocmds that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/autocmds.lua
-- Add any additional autocmds here

-- Set up the macro in register 'a' during startup
vim.api.nvim_create_autocmd("VimEnter", {
  callback = function()
    -- The macro contents: o// ai<Esc>:w<CR>dd:w<CR>
    vim.fn.setreg("a", "o// ai\x1b:w\rdd:w\r")
  end,
  group = vim.api.nvim_create_augroup("CustomMacros", { clear = true }),
})
