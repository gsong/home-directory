-- bootstrap lazy.nvim, LazyVim and your plugins
require("config.lazy")

vim.api.nvim_create_user_command("Rfinder", function()
  local path = vim.fn.expand("%:p:h")
  if path then
    vim.fn.jobstart({ "open", path }, { detach = true })
  else
    vim.notify("No file path found", vim.log.levels.ERROR)
  end
end, {})
