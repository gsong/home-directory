-- The plugin bundles Mermaid 10.2.3; replace it with a newer build after every install/update.
local mermaid_version = "11.17.2"

return {
  "iamcco/markdown-preview.nvim",
  build = function(plugin)
    require("lazy").load({ plugins = { "markdown-preview.nvim" } })
    vim.fn["mkdp#util#install"]()
    vim.fn.system({
      "curl",
      "-fsSL",
      "https://cdn.jsdelivr.net/npm/mermaid@" .. mermaid_version .. "/dist/mermaid.min.js",
      "-o",
      plugin.dir .. "/app/_static/mermaid.min.js",
    })
    if vim.v.shell_error ~= 0 then
      vim.notify("markdown-preview: failed to download Mermaid " .. mermaid_version, vim.log.levels.ERROR)
    end
  end,
}
