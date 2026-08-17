class ImportRow < ApplicationRecord
  belongs_to :import_job
  belongs_to :matched_person, class_name: "Person", optional: true
  belongs_to :created_person, class_name: "Person", optional: true
end
