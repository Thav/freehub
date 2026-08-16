# Ruby 1.9 reports controller instance variables as symbols, while
# authorization-1.0.12 looks for a string. Preserve the gem's behavior while
# making its model lookup work in the container's historical Ruby runtime.
module Authorization
  module Base
    module ControllerInstanceMethods
      def get_model(str)
        if str =~ /\s*([A-Z]+\w*)\s*/
          begin
            Module.const_get(str)
          rescue
            raise CannotObtainModelClass, "Couldn't find model class: #{str}"
          end
        elsif str =~ /\s*:*(\w+)\s*/
          model_name = $1
          model_symbol = model_name.to_sym
          if @options[model_symbol]
            @options[model_symbol]
          elsif instance_variable_defined?("@#{model_name}")
            instance_variable_get("@#{model_name}")
          else
            raise CannotObtainModelObject, "Couldn't find model (#{str}) in hash or as an instance variable"
          end
        end
      end

      # authorization-1.0.12 redirects denied users through a non-existent
      # User#uri helper. Keep the intended behavior: return a signed-in user
      # to their organization (or the public root when they have no role).
      def handle_redirection
        return unless respond_to?(:redirect_to)
        send(STORE_LOCATION_METHOD) if respond_to?(STORE_LOCATION_METHOD)
        flash[:notice] = @options[:permission_denied_message] || 'Permission denied. You cannot access the requested page.'
        destination = @current_user && @current_user.organization
        redirect_to(destination || root_path)
        false
      end
    end
  end
end
