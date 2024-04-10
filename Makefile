.PHONY: dev localdev localdeploy deploy
dev:
	pnpm dev
localdev:
	pnpm run localdev
localdeploy:
	pnpm run localdeploy
deploy:
	pnpm run deploy
