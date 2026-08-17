organization = Organization.find_or_create_by!(key: "spike-shop") { |record| record.name = "Spike Bike Shop"; record.timezone = "America/Chicago" }
manager = User.find_or_initialize_by(login: "manager"); manager.assign_attributes(email: "manager@example.test", name: "Spike Manager", password: "spike-password", password_confirmation: "spike-password", password_change_required: false); manager.save!
Membership.find_or_create_by!(organization:, user: manager) { |record| record.role = "manager" }
Person.find_or_create_by!(id: 900001) { |record| record.organization = organization; record.first_name = "Ada"; record.last_name = "Rider"; record.display_name = "Ada Rider"; record.email = "ada@example.test"; record.normalized_email = "ada@example.test" }
