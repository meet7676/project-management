import { Client, Account, ID, Databases, Query } from "appwrite"

// Initialize the Appwrite client
const client = new Client().setEndpoint("https://cloud.appwrite.io/v1").setProject("67d05997003e7a634b74") // Replace with your Appwrite project ID

const account = new Account(client)
const databases = new Databases(client)

// Database and collection IDs
const DATABASE_ID = ""
const USERS_COLLECTION_ID = ""

// Update the createAccount function to include the role
export async function createAccount(email: string, password: string, name: string, role = "developer") {
  try {
    // Create the account in Appwrite Auth
    const newAccount = await account.create(ID.unique(), email, password, name)

    if (newAccount) {
      // Create a user document in the database with role information
      await databases.createDocument(DATABASE_ID, USERS_COLLECTION_ID, newAccount.$id, {
        email: email,
        name: name,
        role: role, // Use the provided role or default to 'developer'
        createdAt: new Date().toISOString(),
      })

      // Log in the user after successful account creation
      await login(email, password)
    }

    return newAccount
  } catch (error) {
    console.error("Error creating account:", error)
    throw error
  }
}

// Login user
export async function login(email: string, password: string) {
  try {
    return await account.createEmailPasswordSession(email, password)
  } catch (error) {
    console.error("Login error:", error)
    throw error
  }
}

// Logout user
export async function logout() {
  try {
    return await account.deleteSession("current")
  } catch (error) {
    console.error("Logout error:", error)
    throw error
  }
}

// Get current user with role information
export async function getCurrentUser() {
  try {
    const currentAccount = await account.get()

    if (!currentAccount) return null

    // Get the user document with role information
    try {
      const userDoc = await databases.getDocument(DATABASE_ID, USERS_COLLECTION_ID, currentAccount.$id)
      // Combine account and user document data
      return {
        ...currentAccount,
        role: userDoc?.role ?? "",
        // Add any other user profile data here
      }
    } catch (error) {
      console.error("Error fetching user document:", error)
      // Return basic account info if user document not found
      return {
        ...currentAccount,
        role: "developer", // Default role
      }
    }
  } catch (error) {
    console.error("Get current user error:", error)
    return null
  }
}

// Check if user is an admin
export async function isUserAdmin() {
  const user = await getCurrentUser()
  return user?.role === "admin"
}

// Check if user is a project manager
export async function isUserProjectManager() {
  const user = await getCurrentUser()
  return user?.labels[0] === "admin" || user?.labels[0] === "projectManager"
}

// Update user role
export async function updateUserRole(userId: string, role: "admin" | "projectManager" | "developer") {
  try {
    const currentUser = await getCurrentUser()

    // Only admins can update roles
    if (currentUser?.role !== "admin") {
      throw new Error("Permission denied. Only admins can update user roles.")
    }

    return await databases.updateDocument(DATABASE_ID, USERS_COLLECTION_ID, userId, {
      role: role,
    })
  } catch (error) {
    console.error("Error updating user role:", error)
    throw error
  }
}

// Get user by ID
export async function getUserById(userId: string) {
  try {
    return await databases.getDocument(DATABASE_ID, USERS_COLLECTION_ID, userId)
  } catch (error) {
    console.error("Error fetching user:", error)
    return null
  }
}

// Search users by email
export async function searchUsersByEmail(email: string) {
  try {
    const response = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [Query.equal("email", email)])

    return response.documents
  } catch (error) {
    console.error("Error searching users:", error)
    return []
  }
}
