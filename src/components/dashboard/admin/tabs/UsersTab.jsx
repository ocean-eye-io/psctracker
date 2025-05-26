import React, { useState, useEffect } from 'react';
import UserTable from '../components/UserTable'; // Adjust path if necessary

const UsersTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Your auth-lambda's Function URL
  const AUTH_LAMBDA_FUNCTION_URL = 'https://c73anpavlg4ezzsye5selr55gm0sagll.lambda-url.ap-south-1.on.aws/';

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('Frontend: Attempting to fetch users from auth-lambda Function URL...');
        const response = await fetch(AUTH_LAMBDA_FUNCTION_URL, {
          method: 'POST', // Use POST as per auth-lambda's handler for internal invocation
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            source: 'frontend', // Indicate the source of the invocation
            action: 'listUsers', // The action to perform
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Frontend: Successfully fetched users:', data);

        // The auth-lambda returns an array of Cognito user objects.
        // We need to transform them slightly to fit the UserTable's expected 'rdsData' structure
        // for username and email, and provide empty arrays for roles/vessels.
        const transformedUsers = data.map(cognitoUser => {
          const username = cognitoUser.Username;
          const emailAttr = cognitoUser.Attributes.find(attr => attr.Name === 'email');
          const email = emailAttr ? emailAttr.Value : 'N/A';
          const sub = cognitoUser.Attributes.find(attr => attr.Name === 'sub')?.Value;

          return {
            cognitoUser: cognitoUser, // Keep the original Cognito user object
            rdsData: { // Mock rdsData structure for UserTable compatibility
              user_id: sub, // Use sub as user_id for keying
              cognito_username: username,
              email: email,
              roles: [], // No roles from auth-lambda
              assigned_vessels: [] // No vessels from auth-lambda
            }
          };
        });

        setUsers(transformedUsers);
      } catch (err) {
        console.error('Frontend: Error fetching users:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []); // Empty dependency array means this runs once on component mount

  if (loading) {
    return <p>Loading users...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  // Placeholder functions for onEdit and onDelete as they are not implemented yet
  const handleEdit = (user) => {
    console.log('Edit user:', user);
    alert('Edit functionality not yet implemented.');
  };

  const handleDelete = (userId) => {
    console.log('Delete user ID:', userId);
    alert('Delete functionality not yet implemented.');
  };

  return (
    <div className="users-tab-content">
      <h4>Manage Users</h4>
      <UserTable users={users} onEdit={handleEdit} onDelete={handleDelete} />
    </div>
  );
};

export default UsersTab;