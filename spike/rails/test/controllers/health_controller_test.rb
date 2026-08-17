require "test_helper"

class HealthControllerTest < ActionDispatch::IntegrationTest
  test "health does not require a database session" do
    get "/up"
    assert_response :success
    assert_equal({ "status" => "ok" }, response.parsed_body)
  end
end
