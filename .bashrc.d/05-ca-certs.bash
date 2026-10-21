# Point OpenSSL-based tools (curl, Python, uv) at Homebrew's CA bundle.
# macOS /etc/ssl/cert.pem lags on distrusts: in Oct 2026 it still trusted the
# roots behind the compromised eMudhra intermediates after Homebrew dropped them.
# Must run after 01-homebrew.bash, which sets HOMEBREW_PREFIX.
CA_BUNDLE="${HOMEBREW_PREFIX}/etc/ca-certificates/cert.pem"
if [[ -r "$CA_BUNDLE" ]]; then
	export SSL_CERT_FILE="$CA_BUNDLE"
	# requests reads certifi, not SSL_CERT_FILE
	export REQUESTS_CA_BUNDLE="$CA_BUNDLE"
	# No NODE_OPTIONS=--use-openssl-ca: Claude Code's native binary reads it
	# and then fails TLS to api.anthropic.com (UNABLE_TO_GET_ISSUER_CERT_LOCALLY).
fi
unset CA_BUNDLE
