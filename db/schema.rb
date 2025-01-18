# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.0].define(version: 2023_01_08_181157) do
  create_table "notes", charset: "utf8mb4", force: :cascade do |t|
    t.text "body"
    t.bigint "created_by_user_id", null: false
    t.bigint "updated_by_user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_by_user_id"], name: "index_notes_on_created_by_user_id"
    t.index ["updated_by_user_id"], name: "index_notes_on_updated_by_user_id"
  end

  create_table "organizations", charset: "utf8mb4", force: :cascade do |t|
    t.string "name", null: false
    t.string "slug", null: false
    t.string "location", null: false
    t.string "timezone", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["slug"], name: "index_organizations_on_slug", unique: true
  end

  create_table "people", charset: "utf8mb4", force: :cascade do |t|
    t.text "first_name", null: false
    t.text "last_name", null: false
    t.integer "birth_year"
    t.text "country", null: false
    t.json "address", null: false
    t.string "email"
    t.string "phone"
    t.boolean "email_opt_out", default: false, null: false
    t.boolean "staff", default: false, null: false
    t.bigint "organization_id", null: false
    t.bigint "created_by_user_id", null: false
    t.bigint "updated_by_user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_by_user_id"], name: "index_people_on_created_by_user_id"
    t.index ["email", "organization_id"], name: "index_people_on_email_and_organization_id", unique: true
    t.index ["organization_id"], name: "index_people_on_organization_id"
    t.index ["phone", "organization_id"], name: "index_people_on_phone_and_organization_id", unique: true
    t.index ["updated_by_user_id"], name: "index_people_on_updated_by_user_id"
  end

  create_table "people_notes", charset: "utf8mb4", force: :cascade do |t|
    t.bigint "person_id", null: false
    t.bigint "note_id", null: false
    t.index ["note_id"], name: "index_people_notes_on_note_id"
    t.index ["person_id"], name: "index_people_notes_on_person_id"
  end

  create_table "services", charset: "utf8mb4", force: :cascade do |t|
    t.datetime "start_date"
    t.datetime "end_date"
    t.boolean "paid", default: false, null: false
    t.boolean "volunteered", default: false, null: false
    t.string "service_type", null: false
    t.bigint "organization_id", null: false
    t.bigint "note_id"
    t.bigint "person_id", null: false
    t.bigint "created_by_user_id", null: false
    t.bigint "updated_by_user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_by_user_id"], name: "index_services_on_created_by_user_id"
    t.index ["note_id"], name: "index_services_on_note_id"
    t.index ["organization_id"], name: "index_services_on_organization_id"
    t.index ["person_id"], name: "index_services_on_person_id"
    t.index ["updated_by_user_id"], name: "index_services_on_updated_by_user_id"
  end

  create_table "user_organization_roles", charset: "utf8mb4", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.bigint "organization_id", null: false
    t.text "role", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id"], name: "index_user_organization_roles_on_organization_id"
    t.index ["user_id", "organization_id"], name: "index_user_organization_roles_on_user_id_and_organization_id", unique: true
    t.index ["user_id"], name: "index_user_organization_roles_on_user_id"
  end

  create_table "users", charset: "utf8mb4", force: :cascade do |t|
    t.text "first_name", null: false
    t.text "last_name", null: false
    t.boolean "admin", default: false
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.integer "sign_in_count", default: 0, null: false
    t.datetime "current_sign_in_at"
    t.datetime "last_sign_in_at"
    t.string "current_sign_in_ip"
    t.string "last_sign_in_ip"
    t.string "confirmation_token"
    t.datetime "confirmed_at"
    t.datetime "confirmation_sent_at"
    t.string "unconfirmed_email"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["confirmation_token"], name: "index_users_on_confirmation_token", unique: true
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  create_table "visits", charset: "utf8mb4", force: :cascade do |t|
    t.boolean "volunteer", default: false, null: false
    t.datetime "arrived_at"
    t.datetime "start_at"
    t.datetime "end_at"
    t.bigint "organization_id", null: false
    t.bigint "note_id"
    t.bigint "person_id", null: false
    t.bigint "created_by_user_id", null: false
    t.bigint "updated_by_user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["created_by_user_id"], name: "index_visits_on_created_by_user_id"
    t.index ["note_id"], name: "index_visits_on_note_id"
    t.index ["organization_id"], name: "index_visits_on_organization_id"
    t.index ["person_id"], name: "index_visits_on_person_id"
    t.index ["updated_by_user_id"], name: "index_visits_on_updated_by_user_id"
  end

  add_foreign_key "notes", "users", column: "created_by_user_id"
  add_foreign_key "notes", "users", column: "updated_by_user_id"
  add_foreign_key "people", "organizations"
  add_foreign_key "people", "users", column: "created_by_user_id"
  add_foreign_key "people", "users", column: "updated_by_user_id"
  add_foreign_key "people_notes", "notes"
  add_foreign_key "people_notes", "people"
  add_foreign_key "services", "notes"
  add_foreign_key "services", "organizations"
  add_foreign_key "services", "people"
  add_foreign_key "services", "users", column: "created_by_user_id"
  add_foreign_key "services", "users", column: "updated_by_user_id"
  add_foreign_key "user_organization_roles", "organizations"
  add_foreign_key "user_organization_roles", "users"
  add_foreign_key "visits", "notes"
  add_foreign_key "visits", "organizations"
  add_foreign_key "visits", "people"
  add_foreign_key "visits", "users", column: "created_by_user_id"
  add_foreign_key "visits", "users", column: "updated_by_user_id"
end
