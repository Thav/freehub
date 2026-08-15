# Freehub modernization

This directory is the durable source of truth for the Freehub modernization. It is designed so a new working session can resume without access to earlier chat history.

- [Plan](PLAN.md)
- [Session loop](RALPH.md)
- [Tracker](TRACKER.yml)
- [Development environment](environment.md)
- [Current product specification](current-product-spec.md)
- [Data dictionary](data-dictionary.md)
- [Screen inventory](screen-inventory.md)
- [Parity matrix](parity-matrix.md)
- [Risks and decisions](risks-and-decisions.md)
- [Tickets](tickets/)

Run `bin/ralph status` for current state and `bin/ralph next` to identify the next dependency-ready ticket.

`TRACKER.yml` uses JSON syntax, which is valid YAML 1.2. This lets `bin/ralph`
run with Node alone and without downloading a YAML package.
