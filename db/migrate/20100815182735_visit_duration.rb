class VisitDuration < ActiveRecord::Migration
  def self.up
    add_column :visits, :duration, :double
  end

  def self.down
    remove_column :visits, :duration
  end
end
