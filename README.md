## Using the dev container
The easiest way to start developing Freehub is to use the dev container. This sets up the environment in a docker container with all of the prerequisites so you don't have to install them on your host operating system.

### Caveats

* SSH key connectivity to Github
    * Ensure your ssh keys are set up properly with Github on your host OS https://docs.github.com/en/authentication/connecting-to-github-with-ssh/adding-a-new-ssh-key-to-your-github-account
    * Ensure `ssh-agent` is running on your host OS you have have run `ssh-add` to add them to the agent
    * Check that the appropriate keys are listed in `ssh-add -l` on both the host and container
    * https://code.visualstudio.com/remote/advancedcontainers/sharing-git-credentials
* Ruby version
    * During inital setup, the files in this repository called for ruby version 3.2.0, but Microsoft's dev container (`cr.microsoft.com/vscode/devcontainers/ruby:0-3.2`) provided 3.2.2
    * This repository was updated to match the target container, and that target container may update in the future
* Environment variables
    * something with .env.example
* Node not installed
    * it was dev containers features
* Migration script
    * 2025-04-12 - Added lib/tasks/db_import.rake which imports SQL dumps into development
    * 2025-04-19 - Mysql2 gem import fails because SQL dump breaks statements across multiple lines, going to use `mysql` call to CLI for import
    * 2025-04-20 - Would like to remove `root` user access to database before I continue
        * Latest migration from dump file should be like `rake migrate:database:from_dump[/workspace/db/freehub_for_all_development_Clean2.sql]`
        * Something about `LoadError: cannot load such file -- /usr/local/rvm/gems/default/gems/mail-2.8.0/lib/mail/indifferent_hash.rb (LoadError)` in the users migration
