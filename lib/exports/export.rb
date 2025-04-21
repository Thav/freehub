require 'csv'

module Exports
  class Export
    class_attribute :columns, instance_writer: false
    class_attribute :model_class, instance_writer: false

    def initialize(collection)
      @collection = collection
      raise 'Exporter must have a model_class attribute' unless self.model_class
      raise "collection must be an ActiveRecord::Relation of #{model_class.name}" unless @collection.is_a?(ActiveRecord::Relation) && @collection.name == self.model_class.name
    end

    def to_csv
      CSV.generate do |csv|
        csv << column_names
        @collection.each { |record| csv << record_to_row(record) }
      end
    end

    def record_to_row(record)
      self.columns.map do |column|
        value = get_attribute_value(record, column[:model_attr])
        cast_value(value, column[:type]) 
      end
    end

    def get_attribute_value(record, model_attr)
      return model_attr.call(record) if model_attr.is_a?(Proc)

      record.public_send(model_attr)
    end
  
    def cast_value(value, type)
      type.call(value) if type.is_a?(Proc)

      public_send("format_#{type}", value)
    end

    def column_names
      self.columns.map { |c| c[:name] }
    end

    def format_string(string)
      string
    end

    def format_datetime(datetime)
      datetime&.strftime('%m/%d/%Y %I:%M %p')
    end

    def format_boolean(boolean)
      !!boolean
    end

    def self.inherited(subclass)
      super
      subclass.columns = []
      subclass.model_class = nil
    end

    # Add a column to the export
    # name: name of the column, used as the header and as the attribute name on the model if model_attr is not provided
    # type: :string, :datetime, or :boolean, can also be a proc that takes the attribute value and returns a formatted string
    # model_attr: the attribute name on the model, defaults to name, can be a proc that takes the model and returns the attribute value
    def self.add_column(name, type, model_attr=nil)
      model_attr ||= name

      columns << {
        name: name,
        type: type,
        model_attr: model_attr
      }
    end
  end
end
