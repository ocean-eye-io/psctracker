// src/config/aws-config.js
const awsConfig = {
  Auth: {
    // Amazon Cognito Region
    region: 'ap-south-1',
    
    // Amazon Cognito User Pool ID
    userPoolId: 'ap-south-1_imhAFyZLw',
    
    // Amazon Cognito Web Client ID
    userPoolWebClientId: '6rae2nmj34vkglmnd2tu380rrm',
    
    // Client Secret 
    clientSecret: 'iort5ud2034ufqrav9ejodb9baa89blt21dqtsmmdtje5p560oo',
    
    // Auth flow type
    authenticationFlowType: 'USER_SRP_AUTH', // Try changing this from USER_PASSWORD_AUTH
  }
};

export default awsConfig;