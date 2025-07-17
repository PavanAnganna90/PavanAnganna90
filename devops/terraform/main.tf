terraform {
  required_version = ">= 1.0"
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

provider "docker" {
  host = "unix:///var/run/docker.sock"
}

# Example: Manage Docker networks via Terraform
resource "docker_network" "opssight_terraform" {
  name = "opssight-terraform-managed"
  driver = "bridge"
  
  ipam_config {
    subnet = "172.26.0.0/16"
  }
}
