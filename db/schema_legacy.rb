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

ActiveRecord::Schema[7.0].define(version: 2012_03_31_231122) do
  create_table "notes", id: false, charset: "utf8", collation: "utf8_unicode_ci", force: :cascade do |t|
    t.integer "id", null: false
    t.text "text"
    t.integer "notable_id"
    t.string "notable_type"
    t.integer "created_by_id"
    t.integer "updated_by_id"
    t.datetime "created_at", precision: nil
    t.datetime "updated_at", precision: nil
  end

  create_table "organizations", id: false, charset: "utf8", collation: "utf8_unicode_ci", force: :cascade do |t|
    t.integer "id", null: false
    t.string "name"
    t.string "key"
    t.string "timezone"
    t.datetime "created_at", precision: nil
    t.datetime "updated_at", precision: nil
    t.string "location"
  end

  create_table "people", id: false, charset: "utf8", collation: "utf8_unicode_ci", force: :cascade do |t|
    t.integer "id", null: false
    t.string "first_name"
    t.string "last_name"
    t.string "full_name"
    t.string "street1"
    t.string "street2"
    t.string "city"
    t.string "state"
    t.string "postal_code"
    t.string "country"
    t.string "email"
    t.boolean "email_opt_out", default: false
    t.string "phone"
    t.boolean "staff", default: false
    t.datetime "created_at", precision: nil
    t.datetime "updated_at", precision: nil
    t.integer "created_by_id"
    t.integer "updated_by_id"
    t.integer "organization_id"
    t.integer "yob"
  end

  create_table "roles", id: false, charset: "utf8", collation: "utf8_unicode_ci", force: :cascade do |t|
    t.integer "id", null: false
    t.string "name", limit: 40
    t.string "authorizable_type", limit: 40
    t.integer "authorizable_id"
    t.datetime "created_at", precision: nil
    t.datetime "updated_at", precision: nil
  end

  create_table "roles_users", id: false, charset: "utf8", collation: "utf8_unicode_ci", force: :cascade do |t|
    t.integer "user_id"
    t.integer "role_id"
    t.datetime "created_at", precision: nil
    t.datetime "updated_at", precision: nil
  end

  create_table "services", id: false, charset: "utf8", collation: "utf8_unicode_ci", force: :cascade do |t|
    t.integer "id", null: false
    t.date "start_date"
    t.date "end_date"
    t.boolean "paid", default: false
    t.boolean "volunteered", default: false
    t.string "service_type_id"
    t.integer "person_id"
    t.datetime "created_at", precision: nil
    t.datetime "updated_at", precision: nil
    t.integer "created_by_id"
    t.integer "updated_by_id"
  end

end
