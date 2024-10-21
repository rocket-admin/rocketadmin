variable "DEFAULT_TAG" {
  default = "rocketadmin-agent:local"
}

// Special target: https://github.com/docker/metadata-action#bake-definition
target "docker-metadata-action" {
  tags = ["${DEFAULT_TAG}"]
}

group "default" {
  targets = ["image-local"]
}

target "image-local" {
  context = ".."
  dockerfile = "./Dockerfile.rocketadmin-agent"
}

target "image" {
  inherits = ["docker-metadata-action"]
  context = ".."
  dockerfile = "./Dockerfile.rocketadmin-agent"
}

target "image-all" {
  inherits = ["image"]
  platforms = [
    "linux/amd64",
    "linux/arm64"
  ]
}