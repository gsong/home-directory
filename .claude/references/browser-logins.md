# Browser sign-ins

Fill every secret from 1Password straight into the field, so it stays out of the transcript.

1. Find the item and its vault with `op item list`. It prints metadata only.
2. Fill the username and password by the fields' purpose: `agent-browser fill <sel> "$(op item get <item> --vault <vault> --format json | jq -r '.fields[]|select(.purpose=="PASSWORD").value')"`, and `"USERNAME"` for the username. A login item can also hold saved web-form fields with the same labels, some empty, and `op read 'op://<vault>/<item>/password'` returns whichever comes first. Use `op read` for any other field, such as a custom user ID.
3. Fill an authenticator code: `op item get <item> --vault <vault> --otp`.

Name the vault in every `op` call. `op` signed in as a service account, as in a container, refuses a command that leaves it out.

When a site offers a passkey first, pick "Try another way" and sign in with the password.

The sign-in is done when the page shows the signed-in view.
