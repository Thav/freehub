class DatabaseTasks
  include Rake::DSL
  attr_reader :database_name

  def initialize
    namespace :migrate do
      desc 'Migrate database from the old structure to new structure'
      namespace :database do
        desc 'Use an existing MySQL database to migrate the data'
        task from_db: :environment do
          # Reset the database
          Rake::Task['db:reset'].invoke
          initialize_from_db()
          migrate_all()
          puts 'Migration complete'
        end
        desc 'Use a mysql dump file to migrate the data'
        task from_dump: :environment do
          # Reset the database
          Rake::Task['db:reset'].invoke
          initialize_from_dump()
          migrate_all()
          puts 'Migration complete'
        end
      end
    end
  end

  def migrate_all()
    initialize_database_connection()
    migrate_organizations()
    migrate_users()
    migrate_user_organization_roles()
    migrate_people()
    migrate_visits()
    migrate_services()
    migrate_notes()
  end

  # Load the old database from a sql dump file and connect to it
  def initialize_from_dump()
    database_name = ENV['DB_NAME'] || 'freehub_old'
    file_path = ENV['DB_DUMP']
    raise "DB_DUMP environment variable must be set" unless file_path
    raise "Sql dump '#{file_path}' does not exist, define it with DB_DUMP" unless File.exist?(file_path)

    # Check if the mysql database exists
    # If it doesn't, create it
    # Load the sql dump into the database
    # Connect to the database

    puts "Dropping database '#{database_name}'"
    `mysql -u root -e "DROP DATABASE IF EXISTS #{database_name}"`
    puts "Creating database '#{database_name}'"
    `mysql -u root -e "CREATE DATABASE IF NOT EXISTS #{database_name}"`
    puts "Loading database dump '#{file_path}' into database '#{database_name}'"
    `mysql -u root #{database_name} < #{file_path}`

    @database_name = database_name
  end

  # Connect to the old database with ActiveRecord
  def initialize_from_db()
    database_name = ENV['DB_NAME']
    raise "DB_NAME environment variable must be set" unless database_name

    # Check if the mysql database exists
    # If it doesn't, raise an error

    results = `mysql -u root -e "SHOW DATABASES LIKE '#{database_name}'"`
    raise "Database '#{database_name}' does not exist, please make sure DB_NAME is set to an existing database" unless results.include?(database_name)

    @database_name = database_name
  end

  def initialize_database_connection()
    conf = {
      Rails.env.to_sym => {
        primary: Rails.configuration.database_configuration[Rails.env],
        old: {
          adapter: 'mysql2',
          database: @database_name,
          username: ENV['DB_USER'] || 'root',
          password: ENV['DB_PASS'] || 'horcrux',
          host: 'localhost',
        }
      }
    }

    ActiveRecord::Base.configurations = conf
    ActiveRecord::Base.establish_connection(Rails.env.to_sym)

    require 'old_freehub_data' # Load in the old database models, sort of hacky
  end

  def migrate_organizations()
    Organization.transaction do
      puts "Migrating #{OldFreehubData::Organization.count} organizations..."
      OldFreehubData::Organization.find_each do |old_org|
        Organization.create!(
          id: old_org.id,
          name: old_org.name,
          slug: old_org.key,
          timezone: old_org.timezone,
          created_at: old_org.created_at,
          location: old_org.location
        )
      end
    end
  end

  def migrate_users()
    User.transaction do
      puts "Migrating #{OldFreehubData::User.count} users..."
      OldFreehubData::User.find_each do |old_user|
        User.create!(
          id: old_user.id,
          email: old_user.email,
          first_name: old_user.name,
          last_name: '',
          created_at: old_user.created_at,
          password: SecureRandom.hex(16)
        )
        User.find(old_user.id).confirm
      end
    end
  end

  def migrate_user_organization_roles()
    UserOrganizationRole.transaction do
      puts "Migrating #{OldFreehubData::Role.count} user organization roles..."
      OldFreehubData::Role.find_each do |old_role|
        raise "Role '#{old_role.name}' is not a valid role" unless UserOrganizationRole.roles.key?(old_role.name)
        raise "Role Owner '#{old_role.authorizable_type}' is not a valid owner type" unless old_role.authorizable_type == 'Organization'

        org = Organization.find(old_role.authorizable_id)
        old_role.users.each do |old_user|
          user = User.find_by_email(old_user.email)
          role = UserOrganizationRole.create!(
            user: user,
            organization: org,
            role: old_role.name
          )
        end
      end
    end
  end

  def migrate_people()
    Person.transaction do
      puts "Migrating #{OldFreehubData::Person.count} people..."
      OldFreehubData::Person.find_each do |old_person|
        organization = Organization.find_by_slug(old_person.organization.key)

        email = old_person.email.present? ? old_person.email : nil # If the person doesn't have an email, set it to nil so it doesn't fail validation
        phone = old_person.phone.present? ? old_person.phone : nil # If the person doesn't have a phone, set it to nil so it doesn't fail validation

        Person.create!(
          id: old_person.id,
          first_name: old_person.first_name,
          last_name: old_person.last_name,
          email: email,
          created_at: old_person.created_at,
          updated_by_user_id: old_person.updated_by_id,
          created_by_user_id: old_person.created_by_id,
          staff: !!old_person.staff,
          phone: phone,
          birth_year: old_person.yob,
          country: 'US',
          address: {
            street1: old_person.street1,
            street2: old_person.street2,
            city: old_person.city,
            zip: old_person.postal_code,
            state: old_person.state
          },
          email_opt_out: old_person.email_opt_out || false,
          organization: organization
        )
      end
    end
  end

  def migrate_visits()
    Visit.transaction do
      puts "Migrating #{OldFreehubData::Visit.count} visits..."
      visits = []
      OldFreehubData::Visit.preload(:person).find_each do |old_visit|
        visits << {
          id: old_visit.id,
          person_id: old_visit.person_id,
          organization_id: old_visit.person.organization_id,
          created_at: old_visit.created_at,
          updated_by_user_id: old_visit.updated_by_id,
          created_by_user_id: old_visit.created_by_id,
          arrived_at: old_visit.arrived_at,
          start_at: old_visit.start_at,
          end_at: old_visit.end_at ,
          volunteer: !!old_visit.volunteer
        }
      end
      Visit.insert_all!(visits)
    end
  end

  def migrate_services()
    Service.transaction do
      puts "Migrating #{OldFreehubData::Service.count} services..."
      services = []

      OldFreehubData::Service.preload(:person).find_each do |old_service|
        services << {
          id: old_service.id,
          person_id: old_service.person_id,
          organization_id: old_service.person.organization_id,
          created_at: old_service.created_at,
          updated_by_user_id: old_service.updated_by_id,
          created_by_user_id: old_service.created_by_id,
          start_date: old_service.start_date,
          end_date: old_service.end_date,
          service_type: old_service.service_type_id,
          paid: old_service.paid,
          volunteered: old_service.volunteered
        }
      end

      Service.insert_all!(services)
    end
  end

  def migrate_notes()
    Note.transaction do
      puts "Migrating #{OldFreehubData::Note.count} notes..."
      notes = []
      person_notes = []
      visit_updates = {}
      service_updates = {}

      people_ids = Person.pluck(:id).to_set
      visit_ids = Visit.pluck(:id).to_set
      service_ids = Service.pluck(:id).to_set
      OldFreehubData::Note.find_each do |old_note|
        case old_note.notable_type
        when 'Person'
          next unless people_ids.include?(old_note.notable_id)

          # Create a note for the person using person_note join
          person_notes << {
            person_id: old_note.notable_id,
            note_id: old_note.id
          }
        when 'Visit'
          next unless visit_ids.include?(old_note.notable_id)

          # Update the visit to reference the note
          visit_updates[old_note.notable_id] = { note_id: old_note.id }
        when 'Service'
          next unless service_ids.include?(old_note.notable_id)

          # Update the service to reference the note
          service_updates[old_note.notable_id] = { note_id: old_note.id }
        end
        notes << {
          id: old_note.id,
          created_at: old_note.created_at,
          updated_by_user_id: old_note.updated_by_id,
          created_by_user_id: old_note.created_by_id,
          body: old_note.text
        }
      end

      Note.insert_all!(notes)
      Visit.update!(visit_updates.keys, visit_updates.values)
      Service.update!(service_updates.keys, service_updates.values)
      PeopleNote.insert_all!(person_notes)

      puts "Migrated #{notes.count} notes, #{person_notes.count} person_notes, #{visit_updates.count} visit notes, #{service_updates.count} service notes"
    end
  end
end

DatabaseTasks.new
