return {
  {
    "stevearc/conform.nvim",
    optional = true,
    opts = {
      formatters_by_ft = {
        ["sql"] = { "sqlfluff" },
      },
      formatters = {
        sqlfluff = {
          args = { "format", "-" },
        },
      },
    },
  },
  {
    "mfussenegger/nvim-lint",
    opts = {
      linters = {
        sqlfluff = { args = { "lint", "--format=json" } },
      },
    },
  },
}
