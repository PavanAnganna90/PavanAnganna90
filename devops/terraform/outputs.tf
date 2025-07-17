output "network_id" {
  description = "ID of the created Docker network"
  value       = docker_network.opssight_terraform.id
}

output "network_name" {
  description = "Name of the created Docker network"
  value       = docker_network.opssight_terraform.name
}
