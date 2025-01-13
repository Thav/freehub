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
