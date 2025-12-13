.PHONY: dev localdev localdeploy deploy
dev:
	bun dev
localdev:
	bun run localdev
localdeploy:
	bun run localdeploy
deploy:
	bun run deploy
