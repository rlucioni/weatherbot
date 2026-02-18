include .env
export $(shell sed 's/=.*//' .env)

deploy:
	@rm -f .env.yaml
	@echo "generating .env.yaml from .env..."
	@echo "SLACK_BOT_TOKEN: ${SLACK_BOT_TOKEN}" >> .env.yaml
	@echo "SLACK_CHANNEL_ID: ${SLACK_CHANNEL_ID}" >> .env.yaml
	@echo "GEMINI_API_KEY: ${GEMINI_API_KEY}" >> .env.yaml
	@echo "deploying to GCP..."
	npm run deploy
	@rm .env.yaml
	@echo "deployment complete!"

enable:
	gcloud services enable \
	cloudfunctions.googleapis.com \
	run.googleapis.com \
	cloudbuild.googleapis.com \
	artifactregistry.googleapis.com \
	cloudscheduler.googleapis.com

lint:
	npm run lint

ping:
	curl localhost:8080

prettier:
	npm run prettier

reschedule:
	npm run reschedule

schedule:
	npm run schedule

pause:
	npm run pause

resume:
	npm run resume

serve:
	npm run serve
