# Architecture Decisions

- Use responsive card layouts for bank statement data below the `md` breakpoint because wide financial tables clip critical amounts and actions on phones.
- Randomize authentication imagery on each login-screen mount, as requested by the user; select it after hydration to keep the initial server and client render consistent.
- Return the library's typed JSON WebAuthn options from server functions rather than unknown-valued records because TanStack validates serializable response types.
- Consume WebAuthn challenges with a single DELETE RETURNING operation and verify their request origin, RP and expiry before authentication because replay and cross-origin assertions must fail.
- Supply native Web Crypto challenges inside both WebAuthn option handlers because the library's default challenge helper fails initialization in published split bundles.
