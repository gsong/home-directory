return {
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        eslint = {
          settings = {
            workingDirectories = { mode = "auto" },
            useFlatConfig = true,
          },
        },

        prismals = {},
      },
    },

    init = function()
      local keys = require("lazyvim.plugins.lsp.keymaps").get()
      -- change a keymap
      keys[#keys + 1] = { "<leader>cl", "<cmd>LspRestart<cr>", desc = "Lsp Restart" }
    end,
  },
}
