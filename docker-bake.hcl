variable "DEFAULT_TAG" {
  default = "rocketadmin:local"
}

// Frontend built into the image: "angular" (frontend/) or "vue" (frontend-vue/).
// Override with FRONTEND=angular docker buildx bake ... to roll back to the Angular app.
variable "FRONTEND" {
  default = "vue"
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
