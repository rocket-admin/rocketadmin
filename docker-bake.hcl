variable "DEFAULT_TAG" {
  default = "rocketadmin:local"
}

// Frontend built into the image: "angular" (frontend/) or "vue" (frontend-vue/).
// Override with FRONTEND=vue docker buildx bake ...
variable "FRONTEND" {
  default = "angular"
}

// Special target: https://github.com/docker/metadata-action#bake-definition
target "docker-metadata-action" {
  tags = ["${DEFAULT_TAG}"]
}
group "default" {
	targets = ["image-local"]
}

target "frontend" {
  args = {
    FRONTEND = "${FRONTEND}"
  }
}

target "image-local" {
	inherits = ["frontend"]
	context = "."
}

target "image" {
  inherits = ["docker-metadata-action", "frontend"]
}

target "image-all" {
  inherits = ["image"]
  platforms = [
    "linux/amd64",
    "linux/arm64"
  ]
}
