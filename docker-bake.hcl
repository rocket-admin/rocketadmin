variable "DEFAULT_TAG" {
  default = "rocketadmin:local"
}

// Special target: https://github.com/docker/metadata-action#bake-definition
target "docker-metadata-action" {
  tags = ["${DEFAULT_TAG}"]
}
group "default" {
	targets = ["image-local"]
}

target "image-local" {
	context = "."
}

target "image" {
  inherits = ["docker-metadata-action"]
}

target "image-all" {
  inherits = ["image"]
  platforms = [
    "linux/amd64",
    "linux/arm64"
  ]
}
