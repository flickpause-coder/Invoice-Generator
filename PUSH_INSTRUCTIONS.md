# Deploying Local Changes to GitHub

This project currently lives in your local environment. To publish the latest changes to your GitHub repository, follow these steps:

1. Verify the remote URL points to the correct GitHub repository:
   ```bash
   git remote -v
   ```
   If it does not list `https://github.com/flickpause-coder/Invoice-Generator.git`, add it with:
   ```bash
   git remote add origin https://github.com/flickpause-coder/Invoice-Generator.git
   ```
   or update the existing remote:
   ```bash
   git remote set-url origin https://github.com/flickpause-coder/Invoice-Generator.git
   ```

2. Fetch the latest changes and review the history:
   ```bash
   git fetch origin
   git log --oneline origin/main
   ```

3. If GitHub reports a merge conflict when you open a pull request, bring the remote changes into your local branch and resolve the conflict:
   ```bash
   git merge origin/main
   ```
   Git will pause at any conflicted files. Edit each file to keep the desired sections, delete the `<<<<<<<`, `=======`, and `>>>>>>>` markers, then stage the resolution:
   ```bash
   git add <file1> <file2>
   git commit
   ```
   If you prefer to review the remote branch before merging, you can check it out separately:
   ```bash
   git checkout origin/main -- <path>
   ```

4. Push your local branch (for example, `work`) to GitHub:
   ```bash
   git push -u origin work
   ```
   Replace `work` with the name of the branch you intend to publish. If you would like the branch to be named `main`, use:
   ```bash
   git push -u origin work:main
   ```

5. After pushing, create a pull request on GitHub if you want to merge your branch into `main` via the web interface.

6. If you encounter authentication prompts, ensure you are using a personal access token with appropriate permissions or have configured SSH keys.

These steps will ensure your local commits are available on GitHub.
