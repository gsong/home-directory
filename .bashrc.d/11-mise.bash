# Must run AFTER every PATH-prepending fragment (01-homebrew, 02-path, 10-sed,
# 10-gcloud) so mise shims land first in PATH — otherwise `mise doctor` warns
# that system tools can shadow mise-managed ones. Anything depending on a
# mise-managed binary must be numbered above this (see 12-teamocil.bash).
eval "$(mise activate bash)"
