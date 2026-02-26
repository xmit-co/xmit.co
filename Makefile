.PHONY: dev localdev localdeploy deploy
dev:
	bun i && bun dev
localdev:
	bun i && bun run localdev
localdeploy:
	bun i && bun run localdeploy
deploy:
	bun i && bun run deploy
