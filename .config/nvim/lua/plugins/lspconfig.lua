return {
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        prismals = {},
        ["*"] = {
          keys = {
            { "<leader>cl", "<cmd>LspRestart<cr>", desc = "Lsp Restart" },
          },
        },
      },
    },
  },
}
