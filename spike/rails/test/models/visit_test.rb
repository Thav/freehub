require "test_helper"

class VisitTest < ActiveSupport::TestCase
  test "staff and membership snapshots are immutable after insert" do
    organization = Organization.create!(name: "Test", key: "test", timezone: "America/Chicago")
    person = Person.create!(organization:, first_name: "Ada", display_name: "Ada")
    visit = Visit.create!(organization:, person:, activity: "project", arrived_at: Time.current, staff_snapshot: false, member_snapshot: false)
    assert_raises(ActiveRecord::ReadonlyAttributeError) do
      visit.update!(staff_snapshot: true, member_snapshot: true)
    end
    assert_equal false, visit.reload.staff_snapshot
    assert_equal false, visit.reload.member_snapshot
  end
end
