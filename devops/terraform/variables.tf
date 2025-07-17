variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "opssight"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "local"
}

variable "docker_host" {
  description = "Docker host"
  type        = string
  default     = "unix:///var/run/docker.sock"
}
