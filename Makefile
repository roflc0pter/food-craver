include .env
export $(shell sed 's/=.*//' .env)

# Default Target (if just "make" is executed)
.DEFAULT_GOAL := help

## Install dependencies for backend and scraper
install:
	cd $(BACKEND_DIR) && yarn install
	cd $(SCRAPER_DIR) && yarn install

## Build the entire project
build: build-backend build-scraper build-images

build-backend:
	cd $(BACKEND_DIR) && yarn build

build-scraper:
	cd $(SCRAPER_DIR) && yarn build

build-images:
	echo $(BROKER_DIR)
	cd $(BROKER_DIR) && docker build -t $(BROKER_IMAGE) .
	cd $(DB_DIR) && docker build -t $(DB_IMAGE) .
	cd $(CACHE_DIR) && docker build -t $(CACHE_IMAGE) .


start-dev: dev-backend dev-scraper dev-container

dev-backend:
	cd $(BACKEND_DIR) && yarn start:dev

dev-scraper:
	cd $(SCRAPER_DIR) && yarn start:dev

dev-container:
	docker run -d -p $(BROKER_AMQP_PORT):5672 -p $(BROKER_UI_PORT):15672 --name food-craver-message-broker --hostname food-craver-broker -e RABBITMQ_DEFAULT_USER=$(BROKER_USER) -e RABBITMQ_DEFAULT_PASS=$(BROKER_PASSWORD) $(BROKER_IMAGE) 
	docker run -d -p $(DB_PORT):5432 --name food-craver-database -e POSTGRES_USER=$(DB_USER) -e POSTGRES_PASSWORD=$(DB_PASSWORD) $(DB_IMAGE) 
	docker run -d -p $(CACHE_PORT):6379 --name food-craver-cache $(CACHE_IMAGE) 

kill-container:
	docker kill food-craver-message-broker food-craver-database food-craver-cache || true
	docker rm food-craver-message-broker food-craver-database food-craver-cache || true

## Clean the project (remove node_modules and dist)
clean:
	rm -rf $(BACKEND_DIR)/node_modules $(BACKEND_DIR)/dist
	rm -rf $(SCRAPER_DIR)/node_modules $(SCRAPER_DIR)/dist
	yarn cache clean
	$(MAKE) kill-container

## Reset the project (clean + reinstall dependencies)
reset: clean install build

## Show help (List all targets with descriptions)
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
