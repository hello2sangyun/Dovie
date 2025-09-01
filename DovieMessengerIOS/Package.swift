// swift-tools-version: 5.7
import PackageDescription

let package = Package(
    name: "DovieMessenger",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(
            name: "DovieMessenger",
            targets: ["DovieMessenger"]
        ),
    ],
    dependencies: [
        .package(
            url: "https://github.com/google/GoogleSignIn-iOS",
            from: "7.0.0"
        ),
        .package(
            url: "https://github.com/facebook/facebook-ios-sdk",
            from: "16.0.0"
        )
    ],
    targets: [
        .target(
            name: "DovieMessenger",
            dependencies: [
                .product(name: "GoogleSignIn", package: "GoogleSignIn-iOS"),
                .product(name: "FacebookCore", package: "facebook-ios-sdk"),
                .product(name: "FacebookLogin", package: "facebook-ios-sdk")
            ]
        ),
        .testTarget(
            name: "DovieMessengerTests",
            dependencies: ["DovieMessenger"]
        ),
    ]
)