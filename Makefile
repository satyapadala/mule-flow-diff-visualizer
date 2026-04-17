.PHONY: install build watch clean lint package help

# Default shell
SHELL := /bin/zsh

# Paths (Adjusted for the environment)
NODE_PATH := /usr/local/bin:/opt/homebrew/bin
export PATH := $(NODE_PATH):$(PATH)

# Commands
NPM := /opt/homebrew/bin/npm
VITE := /opt/homebrew/bin/npx vite

help:
	@echo "MuleFlow Diff Visualizer Build Commands:"
	@echo "  make install  - Install dependencies"
	@echo "  make build    - Build the extension for production"
	@echo "  make watch    - Build and watch for changes"
	@echo "  make lint     - Run ESLint checks"
	@echo "  make package  - Create a production-ready extension ZIP"
	@echo "  make clean    - Remove build artifacts"

install:
	$(NPM) install

build:
	$(NPM) run build

watch:
	$(VITE) build --watch

lint:
	$(NPM) run lint

package: clean build
	@echo "Packaging extension..."
	mkdir -p releases
	zip -r releases/mule-flow-diff-visualizer-v$$(node -p "require('./package.json').version").zip dist/*
	@echo "Package created in releases/"

clean:
	rm -rf dist
	rm -rf node_modules
	rm -rf releases
