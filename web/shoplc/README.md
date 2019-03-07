This is a responsive web site template built with [citizen](https://github.com/jaysylvester/citizen), including a basic Gulp and Sass build. Feel free to overengineer and overcomplicate as your ego and/or manager requires.

# Instructions

Download the ZIP file, extract its contents to your site's directory, then:

    cd /path/to/yoursite
    npm install
    node app/start.js

See the [citizen documentation](https://github.com/jaysylvester/citizen) for details on how to configure and use citizen.

# Requirements

- Gulp 4.x
- Sass

# Notes

This template uses an [inline configuration](https://github.com/jaysylvester/citizen#inline-config) for simplicity, but a [configuration file](https://github.com/jaysylvester/citizen#config-files) is a more robust way to manage citizen across different environments.

The included .gitignore excludes `app/config/*` to prevent potentially sensitive configuration options (database credentials, for example) being committed to a public repository.
