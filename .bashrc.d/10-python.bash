# pip
export PIP_REQUIRE_VIRTUALENV=true

# uv
# export UV_PYTHON=3.13

syspip() {
	PIP_REQUIRE_VIRTUALENV="" pip "$@"
}
